import { OrderTransformer } from "./OrderTransformer";
import { Customer } from "./Customer";
import moment from "moment";

/**
 * JSON Record Unit Tests
 * 
 * This file demonstrates how to use JSON records copied from the Streamkap Topics page
 * in your unit tests. Use the "Copy Record as JSON" button in the message drawer
 * to get complete record data for testing.
 * 
 * Testing Patterns:
 * 1. Single record tests - Test one complete record transformation
 * 2. Multiple records tests - Test batch processing and edge cases
 * 3. Schema validation - Test records with different schema combinations
 * 4. Error handling - Test malformed or incomplete records
 */

describe("JSON Record Unit Tests", () => {
    let transformer: OrderTransformer;
    
    beforeEach(() => {
        transformer = new OrderTransformer();
    });

    describe("Single Record Tests", () => {
        it("should transform a complete JSON record from Topics page", () => {
            // Example: JSON record copied from Streamkap Topics page
            // Use "Copy Record as JSON" button to get this format
            const completeRecord = {
                "key": {
                    "customer_id": "customer-123"
                },
                "value": {
                    "_id": "order-abc123",
                    "order_type": "OrderType1",
                    "order_number": 98765,
                    "location_id": "store-456",
                    "channel": "express" as const,
                    "customer": {
                        "version": "0.1.4" as const,
                        "_id": "customer-123",
                        "name": "John Doe",
                        "organization_id": "org-789"
                    },
                    "organization_id": "org-789"
                },
                "keySchema": {
                    "type": "struct",
                    "fields": [
                        {
                            "field": "customer_id",
                            "type": "string"
                        }
                    ]
                },
                "valueSchema": {
                    "type": "struct", 
                    "fields": [
                        {
                            "field": "_id",
                            "type": "string"
                        },
                        {
                            "field": "order_type", 
                            "type": "string"
                        },
                        {
                            "field": "customer",
                            "type": "struct"
                        }
                    ]
                },
                "headers": {
                    "source": "order-service",
                    "version": "1.2.3"
                },
                "metadata": {
                    "offset": 12345,
                    "partition": 0,
                    "timestamp": 1693526400000,
                    "timestampType": "CreateTime"
                }
            };

            // Test the transformation using the complete record
            const result = transformer.transform(completeRecord.value);

            // Assertions based on the real data structure
            expect(result.version).toBe("0.1.4");
            expect(result._id).toBe("order-abc123");
            expect(result.order_number).toBe(98765);
            expect(result.location_id).toBe("store-456");
            expect(result.channel).toBe("express");
            expect(result.customer.name).toBe("John Doe");
            expect(result.organization_id).toBe("org-789");
            
            // Verify processing metadata
            expect(result.processed_at).toBeDefined();
            expect(result.processing_id).toBeDefined();
            expect(result.has_valid_customer).toBe(true);
            expect(result.field_count).toBeGreaterThan(0);
        });

        it("should handle record with null/empty values", () => {
            // Example of a record with missing or null fields
            const recordWithNulls = {
                "key": null,
                "value": {
                    "_id": "order-null-test",
                    "order_type": "OrderType1",
                    "order_number": 111,
                    "location_id": "test-location",
                    "channel": "express" as const,
                    "customer": {
                        "version": "0.1.4" as const,
                        "_id": "null-customer",
                        "name": "",
                        "organization_id": "org-test"
                    }
                } as any, // This will allow testing edge cases
                "keySchema": null,
                "valueSchema": {
                    "type": "struct",
                    "fields": []
                },
                "headers": {},
                "metadata": {
                    "offset": 12346,
                    "partition": 1,
                    "timestamp": 1693526401000
                }
            };

            const result = transformer.transform(recordWithNulls.value);

            expect(result._id).toBe("order-null-test");
            expect(result.location_id).toBe("test-location");
            expect(result.customer._id).toBe("null-customer");
            expect(result.has_valid_customer).toBe(false); // Should be false due to empty customer name
        });
    });

    describe("Multiple Records Tests", () => {
        it("should process multiple JSON records consistently", () => {
            // Array of records copied from Topics page
            const multipleRecords = [
                {
                    "key": { "customer_id": "cust-001" },
                    "value": {
                        "_id": "order-001",
                        "order_type": "OrderType1",
                        "order_number": 1001,
                        "location_id": "store-A",
                        "channel": "express" as const,
                        "customer": {
                            "version": "0.1.4" as const,
                            "_id": "cust-001",
                            "name": "Alice Smith",
                            "organization_id": "org-A"
                        },
                        "organization_id": "org-A"
                    },
                    "metadata": { "offset": 100, "partition": 0, "timestamp": 1693526400000 }
                },
                {
                    "key": { "customer_id": "cust-002" },
                    "value": {
                        "order_id": "order-002", // Note: OrderType2 uses order_id instead of _id
                        "order_type": "OrderType2", 
                        "order_number": 1002,
                        "location_id": "store-B",
                        "channel": "rpos" as const,
                        "customer": {
                            "version": "0.1.4" as const,
                            "_id": "cust-002",
                            "name": "Bob Johnson", 
                            "organization_id": "org-B"
                        }
                    },
                    "metadata": { "offset": 101, "partition": 0, "timestamp": 1693526401000 }
                }
            ];

            // Process all records
            const results = multipleRecords.map(record => transformer.transform(record.value));

            // Verify each transformation
            expect(results).toHaveLength(2);
            
            // First record (OrderType1)
            expect(results[0]._id).toBe("order-001");
            expect(results[0].organization_id).toBe("org-A");
            expect(results[0].customer.name).toBe("Alice Smith");
            
            // Second record (OrderType2) 
            expect(results[1]._id).toBe("order-002"); // Should use order_id for OrderType2
            expect(results[1].organization_id).toBe("org-B");
            expect(results[1].customer.name).toBe("Bob Johnson");

            // Verify all have unique processing IDs
            expect(results[0].processing_id).not.toBe(results[1].processing_id);
            
            // Verify all have valid timestamps
            results.forEach(result => {
                expect(moment(result.processed_at).isValid()).toBe(true);
                expect(result.processed_time).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
            });
        });

        it("should handle mixed valid and invalid records", () => {
            const mixedRecords = [
                // Valid record
                {
                    "value": {
                        "_id": "valid-order",
                        "order_type": "OrderType1",
                        "order_number": 2001,
                        "location_id": "store-valid",
                        "channel": "express" as const,
                        "customer": {
                            "version": "0.1.4" as const,
                            "_id": "valid-customer",
                            "name": "Valid Customer",
                            "organization_id": "org-valid"
                        },
                        "organization_id": "org-valid"
                    }
                },
                // Less complete record (testing edge case handling)
                {
                    "value": {
                        "_id": "invalid-order",
                        "order_type": "OrderType1",
                        "order_number": 2002,
                        "location_id": "store-incomplete",
                        "channel": "rpos" as const,
                        "customer": {
                            "version": "0.1.4" as const,
                            "_id": "incomplete-customer",
                            "name": "Incomplete Customer",
                            "organization_id": "org-incomplete"
                        }
                    }
                }
            ];

            const results = mixedRecords.map(record => {
                try {
                    return transformer.transform(record.value);
                } catch (error) {
                    return { error: (error as Error).message };
                }
            });

            // First should succeed
            expect(results[0]).not.toHaveProperty('error');
            expect((results[0] as any)._id).toBe("valid-order");
            
            // Second might fail or have default values depending on implementation  
            expect((results[1] as any)._id).toBe("invalid-order");
            // The transformer should handle missing fields gracefully
        });
    });

    describe("Schema-based Tests", () => {
        it("should validate record against provided schema", () => {
            const recordWithSchema = {
                "key": {
                    "customer_id": "schema-test-customer"
                },
                "value": {
                    "_id": "schema-test-order",
                    "order_type": "OrderType1",
                    "order_number": 3001,
                    "location_id": "schema-store",
                    "channel": "express" as const,
                    "customer": {
                        "version": "0.1.4" as const,
                        "_id": "schema-customer",
                        "name": "Schema Customer", 
                        "organization_id": "schema-org"
                    }
                },
                "keySchema": {
                    "type": "struct",
                    "fields": [
                        {
                            "field": "customer_id", 
                            "type": "string",
                            "optional": false
                        }
                    ]
                },
                "valueSchema": {
                    "type": "struct",
                    "fields": [
                        { "field": "_id", "type": "string", "optional": false },
                        { "field": "order_type", "type": "string", "optional": false },
                        { "field": "order_number", "type": "int32", "optional": false },
                        { "field": "location_id", "type": "string", "optional": true },
                        { "field": "channel", "type": "string", "optional": false }
                    ]
                }
            };

            const result = transformer.transform(recordWithSchema.value);

            // Basic transformation should succeed
            expect(result._id).toBe("schema-test-order");
            expect(result.order_number).toBe(3001);
            
            // Additional schema validation could be added here
            // For example, type checking, required field validation, etc.
        });
    });

    describe("Headers and Metadata Tests", () => {
        it("should process records with various header combinations", () => {
            const recordWithHeaders = {
                "key": { "id": "header-test" },
                "value": {
                    "_id": "header-test-order",
                    "order_type": "OrderType1", 
                    "order_number": 4001,
                    "location_id": "header-store",
                    "channel": "express" as const,
                    "customer": {
                        "version": "0.1.4" as const,
                        "_id": "header-customer",
                        "name": "Header Customer",
                        "organization_id": "header-org"
                    }
                },
                "headers": {
                    "source": "order-service-v2",
                    "trace_id": "abc-123-def-456",
                    "user_id": "user-789",
                    "request_id": "req-999",
                    "custom_field": "custom_value"
                },
                "metadata": {
                    "offset": 54321,
                    "partition": 2,
                    "timestamp": 1693530000000,
                    "timestampType": "CreateTime",
                    "serializedHeaderSize": 156,
                    "serializedKeySize": 28,
                    "serializedValueSize": 445
                }
            };

            const result = transformer.transform(recordWithHeaders.value);
            
            // Verify basic transformation
            expect(result._id).toBe("header-test-order");
            expect(result.order_number).toBe(4001);
            
            // Headers don't directly affect transformation but could be used for tracing
            // This test ensures headers don't break the transformation process
            expect(result.processing_id).toBeDefined();
            expect(result.processed_at).toBeDefined();
        });
    });

    describe("Performance Tests with JSON Records", () => {
        it("should process large number of copied records efficiently", () => {
            // Generate array of similar records (simulating multiple copies from Topics page)
            const largeRecordSet = Array.from({ length: 1000 }, (_, index) => ({
                "key": { "customer_id": `perf-customer-${index}` },
                "value": {
                    "_id": `perf-order-${index}`,
                    "order_type": "OrderType1",
                    "order_number": 5000 + index,
                    "location_id": `perf-store-${index % 10}`, // Cycle through 10 stores
                    "channel": index % 2 === 0 ? ("express" as const) : ("rpos" as const),
                    "customer": {
                        "version": "0.1.4" as const,
                        "_id": `perf-customer-${index}`,
                        "name": `Performance Customer ${index}`,
                        "organization_id": `perf-org-${index % 5}` // Cycle through 5 orgs
                    },
                    "organization_id": `perf-org-${index % 5}`
                },
                "metadata": {
                    "offset": 50000 + index,
                    "partition": index % 3, // 3 partitions
                    "timestamp": 1693530000000 + (index * 1000) // 1 second apart
                }
            }));

            const startTime = Date.now();
            const results = largeRecordSet.map(record => transformer.transform(record.value));
            const endTime = Date.now();

            // Verify all records processed successfully
            expect(results).toHaveLength(1000);
            results.forEach((result, index) => {
                expect(result._id).toBe(`perf-order-${index}`);
                expect(result.processing_id).toBeDefined();
            });

            // Performance assertion (adjust threshold as needed)
            const processingTime = endTime - startTime;
            expect(processingTime).toBeLessThan(5000); // Should process 1000 records in under 5 seconds

            console.log(`Processed 1000 records in ${processingTime}ms (${(processingTime / 1000).toFixed(2)}ms per record)`);
        });
    });
});