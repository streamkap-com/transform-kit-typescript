import { JSONRecordHelper, StreamkapRecord, isStreamkapRecord, loadJSONRecord } from "./JSONRecordHelper";
import { OrderTransformer } from "./OrderTransformer";

describe("JSONRecordHelper", () => {
    const sampleRecord: StreamkapRecord = {
        key: { customer_id: "test-customer" },
        value: {
            _id: "test-order-123",
            order_type: "OrderType1", 
            order_number: 12345,
            location_id: "store-456",
            channel: "express",
            customer: {
                version: "0.1.4",
                _id: "test-customer",
                name: "Test Customer",
                organization_id: "test-org"
            },
            organization_id: "test-org"
        },
        keySchema: {
            type: "struct",
            fields: [{ field: "customer_id", type: "string" }]
        },
        valueSchema: {
            type: "struct",
            fields: [
                { field: "_id", type: "string" },
                { field: "order_type", type: "string" }
            ]
        },
        headers: {
            source: "test-service",
            version: "1.0.0"
        },
        metadata: {
            offset: 12345,
            partition: 0,
            timestamp: 1693526400000,
            timestampType: "CreateTime",
            serializedHeaderSize: 50,
            serializedKeySize: 25,
            serializedValueSize: 200
        },
    };

    describe("validateRecordStructure", () => {
        it("should validate valid record structure", () => {
            expect(JSONRecordHelper.validateRecordStructure(sampleRecord)).toBe(true);
        });

        it("should reject invalid structures", () => {
            expect(JSONRecordHelper.validateRecordStructure({})).toBe(false);
            expect(JSONRecordHelper.validateRecordStructure(null)).toBe(false);
            expect(JSONRecordHelper.validateRecordStructure({ value: {} })).toBe(false); // missing metadata
            expect(JSONRecordHelper.validateRecordStructure({ 
                value: {}, 
                metadata: {} 
            })).toBe(false); // incomplete metadata
        });

        it("should validate minimal valid structure", () => {
            const minimal = {
                value: { test: "data" },
                metadata: {
                    offset: 100,
                    partition: 0,
                    timestamp: Date.now()
                }
            };
            expect(JSONRecordHelper.validateRecordStructure(minimal)).toBe(true);
        });
    });

    describe("data extraction methods", () => {
        it("should extract value correctly", () => {
            const value = JSONRecordHelper.extractValue(sampleRecord);
            expect(value._id).toBe("test-order-123");
            expect(value.order_type).toBe("OrderType1");
        });

        it("should extract key correctly", () => {
            const key = JSONRecordHelper.extractKey(sampleRecord);
            expect(key.customer_id).toBe("test-customer");
        });

        it("should convert timestamp to Date", () => {
            const date = JSONRecordHelper.getTimestampAsDate(sampleRecord);
            expect(date).toBeInstanceOf(Date);
            expect(date.getTime()).toBe(1693526400000);
        });

        it("should generate record summary", () => {
            const summary = JSONRecordHelper.getRecordSummary(sampleRecord);
            expect(summary).toContain("test-order-123");
            expect(summary).toContain("OrderType1");
            expect(summary).toContain("offset=12345");
            expect(summary).toContain("partition=0");
        });
    });

    describe("createTestRecord", () => {
        it("should create test record with defaults", () => {
            const testRecord = JSONRecordHelper.createTestRecord({
                value: { test_field: "test_value" }
            });

            expect(testRecord.value.test_field).toBe("test_value");
            expect(testRecord.metadata.offset).toBe(0);
            expect(testRecord.metadata.partition).toBe(0);
            expect(testRecord.metadata.offset).toBe(0);
        });

        it("should apply overrides correctly", () => {
            const testRecord = JSONRecordHelper.createTestRecord(
                { value: { base: "value" } },
                { 
                    value: { override: "value" },
                    metadata: { offset: 999, partition: 2, timestamp: Date.now() }
                }
            );

            expect(testRecord.value.override).toBe("value");
            expect(testRecord.metadata.offset).toBe(999);
            expect(testRecord.metadata.partition).toBe(2);
        });
    });

    describe("generateRecordSequence", () => {
        it("should generate multiple sequential records", () => {
            const template = {
                value: {
                    _id: "base-order",
                    order_type: "OrderType1",
                    order_number: 1000
                },
                key: { customer_id: "base-customer" }
            };

            const sequence = JSONRecordHelper.generateRecordSequence(template, 3);

            expect(sequence).toHaveLength(3);
            expect(sequence[0].value._id).toBe("base-order-0");
            expect(sequence[1].value._id).toBe("base-order-1");
            expect(sequence[2].value._id).toBe("base-order-2");

            expect(sequence[0].key.customer_id).toBe("base-customer-0");
            expect(sequence[1].key.customer_id).toBe("base-customer-1");

            // Check timestamps are sequential
            expect(sequence[1].metadata.timestamp).toBe(sequence[0].metadata.timestamp + 1000);
            expect(sequence[2].metadata.timestamp).toBe(sequence[1].metadata.timestamp + 1000);
        });
    });

    describe("record comparison", () => {
        it("should compare records correctly", () => {
            const record1 = { _id: "test", processed_at: "2023-01-01", other: "value" };
            const record2 = { _id: "test", processed_at: "2023-01-02", other: "value" };

            // Should be equal when ignoring processed_at
            expect(JSONRecordHelper.compareRecords(record1, record2, ['processed_at'])).toBe(true);

            // Should be different when not ignoring processed_at
            expect(JSONRecordHelper.compareRecords(record1, record2, [])).toBe(false);
        });

        it("should remove fields correctly", () => {
            const record = { keep: "this", remove: "this", also_remove: "this" };
            const cleaned = JSONRecordHelper.removeFields(record, ['remove', 'also_remove']);

            expect(cleaned).toEqual({ keep: "this" });
            expect(cleaned).not.toHaveProperty('remove');
            expect(cleaned).not.toHaveProperty('also_remove');
        });
    });

    describe("schema validation", () => {
        it("should validate schema fields", () => {
            const validation = JSONRecordHelper.validateSchema(sampleRecord, ['_id', 'order_type', 'order_number']);

            expect(validation.valid).toBe(true);
            expect(validation.missing).toHaveLength(0);
            expect(validation.extra.length).toBeGreaterThan(0); // Has more fields than expected
        });

        it("should detect missing fields", () => {
            const validation = JSONRecordHelper.validateSchema(sampleRecord, ['_id', 'missing_field']);

            expect(validation.valid).toBe(false);
            expect(validation.missing).toContain('missing_field');
        });
    });

    describe("field analysis", () => {
        it("should extract unique field names", () => {
            const records = [
                JSONRecordHelper.createTestRecord({ value: { field1: "a", field2: "b" } }),
                JSONRecordHelper.createTestRecord({ value: { field2: "c", field3: "d" } }),
                JSONRecordHelper.createTestRecord({ value: { field1: "e", field3: "f" } })
            ];

            const fieldNames = JSONRecordHelper.extractFieldNames(records);

            expect(fieldNames).toEqual(['field1', 'field2', 'field3']);
        });

        it("should group records by field value", () => {
            const records = [
                JSONRecordHelper.createTestRecord({ value: { type: "A", data: "1" } }),
                JSONRecordHelper.createTestRecord({ value: { type: "B", data: "2" } }),
                JSONRecordHelper.createTestRecord({ value: { type: "A", data: "3" } })
            ];

            const grouped = JSONRecordHelper.groupRecordsByField(records, 'type');

            expect(grouped['A']).toHaveLength(2);
            expect(grouped['B']).toHaveLength(1);
            expect(grouped['A'][0].value.data).toBe("1");
            expect(grouped['A'][1].value.data).toBe("3");
        });
    });

    describe("Kafka message conversion", () => {
        it("should convert to Kafka message format", () => {
            const kafkaMsg = JSONRecordHelper.toKafkaMessage(sampleRecord);

            expect(kafkaMsg.value).toEqual(sampleRecord.value);
            expect(kafkaMsg.key).toEqual(sampleRecord.key);
            expect(kafkaMsg.headers).toEqual(sampleRecord.headers);
            expect(kafkaMsg.timestamp).toBe(sampleRecord.metadata.timestamp);
            expect(kafkaMsg.offset).toBe(sampleRecord.metadata.offset.toString());
            expect(kafkaMsg.partition).toBe(sampleRecord.metadata.partition);
            expect(kafkaMsg.topic).toBe('test-topic');
        });
    });

    describe("type guards and loading", () => {
        it("should work with type guard", () => {
            expect(isStreamkapRecord(sampleRecord)).toBe(true);
            expect(isStreamkapRecord({})).toBe(false);
            expect(isStreamkapRecord(null)).toBe(false);
        });

        it("should load JSON record from string", () => {
            const jsonString = JSON.stringify(sampleRecord);
            const loaded = loadJSONRecord(jsonString);

            expect(loaded).toEqual(sampleRecord);
        });

        it("should throw error for invalid JSON", () => {
            expect(() => loadJSONRecord("invalid json")).toThrow();
            expect(() => loadJSONRecord("{}")).toThrow("Invalid record structure");
        });
    });

    describe("Integration with OrderTransformer", () => {
        it("should work seamlessly with transformer", () => {
            const transformer = new OrderTransformer();
            
            // Create test records using helper
            const testRecords = JSONRecordHelper.generateRecordSequence({
                value: {
                    _id: "integration-test",
                    order_type: "OrderType1",
                    order_number: 9999,
                    location_id: "integration-store",
                    channel: "express",
                    customer: {
                        version: "0.1.4",
                        _id: "integration-customer",
                        name: "Integration Customer",
                        organization_id: "integration-org"
                    },
                    organization_id: "integration-org"
                }
            }, 5);

            // Transform all records
            const results = testRecords.map(record => 
                transformer.transform(JSONRecordHelper.extractValue(record))
            );

            // Verify results
            expect(results).toHaveLength(5);
            results.forEach((result, index) => {
                expect(result._id).toBe(`integration-test-${index}`);
                expect(result.order_number).toBe(9999);
                expect(result.has_valid_customer).toBe(true);
                expect(result.processing_id).toBeDefined();
            });

            // Verify all processing IDs are unique
            const processingIds = results.map(r => r.processing_id);
            const uniqueIds = new Set(processingIds);
            expect(uniqueIds.size).toBe(5);
        });
    });
});