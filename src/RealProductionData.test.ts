import { JSONRecordHelper, StreamkapRecord } from "./JSONRecordHelper";

/**
 * Real Production Data Test Template
 * 
 * INSTRUCTIONS: 
 * 1. Go to Streamkap Topics page → click message → "Copy Record as JSON"  
 * 2. Replace the mockRecord below with your copied JSON
 * 3. Run: npm test src/RealProductionData.test.ts
 * 
 * This demonstrates the complete workflow with real data from your Streamkap instance.
 */

describe("Real Production Data Tests", () => {
    
    // REPLACE THIS with JSON copied from Streamkap Topics page "Copy Record as JSON" button
    const mockRecord: StreamkapRecord = {
        "key": {
            "id": 1  // <- Your real key structure will go here
        },
        "value": {
            "id": 1,
            "example_field": "sample_value",
            // <- Paste your real value structure here
            "_streamkap_source_ts_ms": Date.now(),
            "_streamkap_ts_ms": Date.now() + 1000
        },
        "keySchema": {
            "type": "record",
            "name": "Key",
            // <- Your real key schema will go here
            "fields": [{ "name": "id", "type": "int" }]
        },
        "valueSchema": {
            "type": "record",
            "name": "Value", 
            // <- Your real value schema will go here
            "fields": [
                { "name": "id", "type": "int" },
                { "name": "example_field", "type": "string" }
            ]
        },
        "headers": {
            // <- Your real headers will go here (Debezium CDC headers, etc.)
            "__op": "c"  // c=create, u=update, d=delete
        },
        "metadata": {
            "offset": 12345,
            "partition": 0,
            "timestamp": Date.now(),
            "timestampType": "CreateTime"
            // <- Real metadata from your Kafka message
        }
    };

    describe("JSONRecordHelper Validation", () => {
        it("should validate record structure", () => {
            // Test that our helper correctly validates the record
            const isValid = JSONRecordHelper.validateRecordStructure(mockRecord);
            expect(isValid).toBe(true);
        });

        it("should extract data from record", () => {
            // Test extracting key data
            const key = JSONRecordHelper.extractKey(mockRecord);
            expect(key.id).toBe(1);

            // Test extracting value data  
            const value = JSONRecordHelper.extractValue(mockRecord);
            expect(value.id).toBe(1);
            expect(value.example_field).toBe("sample_value");

            // Test timestamp conversion
            const timestamp = JSONRecordHelper.getTimestampAsDate(mockRecord);
            expect(timestamp).toBeInstanceOf(Date);
        });

        it("should generate meaningful record summary", () => {
            const summary = JSONRecordHelper.getRecordSummary(mockRecord);
            expect(summary).toContain("Record[1]");
            expect(summary).toContain("offset=12345");
            expect(summary).toContain("partition=0");
        });
    });

    describe("Data Processing Examples", () => {
        it("should handle Streamkap-specific fields", () => {
            const value = mockRecord.value;
            
            // Test Streamkap-specific timestamp fields (present in real records)
            expect(value._streamkap_source_ts_ms).toBeDefined();
            expect(value._streamkap_ts_ms).toBeDefined();
            
            // Calculate processing delay (when using real data)
            const processingDelay = value._streamkap_ts_ms - value._streamkap_source_ts_ms;
            expect(processingDelay).toBeGreaterThanOrEqual(0);
        });

        it("should validate Avro schema structure", () => {
            const keySchema = mockRecord.keySchema;
            const valueSchema = mockRecord.valueSchema;
            
            // Validate key schema
            expect(keySchema.type).toBe("record");
            expect(keySchema.name).toBe("Key");
            expect(keySchema.fields).toHaveLength(1);
            expect(keySchema.fields[0].name).toBe("id");
            expect(keySchema.fields[0].type).toBe("int");
            
            // Validate value schema
            expect(valueSchema.type).toBe("record");
            expect(valueSchema.name).toBe("Value");
            expect(valueSchema.fields).toHaveLength(2);
            
            // Check specific field types
            const idField = valueSchema.fields.find((f: any) => f.name === "id");
            const exampleField = valueSchema.fields.find((f: any) => f.name === "example_field");
            
            expect(idField.type).toBe("int");
            expect(exampleField.type).toBe("string");
        });

        it("should handle Debezium headers", () => {
            const headers = mockRecord.headers;
            
            // Test Debezium operation type (c=create, u=update, d=delete)
            expect(headers?.__op).toBe("c");
            // Real records will have __source_db and other CDC headers
        });

        it("should process metadata correctly", () => {
            const metadata = mockRecord.metadata;
            
            expect(metadata.offset).toBe(12345);
            expect(metadata.partition).toBe(0);
            expect(metadata.timestamp).toBeDefined();
            expect(metadata.timestampType).toBe("CreateTime");
            
            // Real records will have serialized sizes
            // expect(metadata.serializedHeaderSize).toBeDefined();
            // expect(metadata.serializedKeySize).toBeDefined(); 
            // expect(metadata.serializedValueSize).toBeDefined();
        });
    });

    describe("Transform Testing Patterns", () => {
        it("should work with generic transform function", () => {
            // Example of how to use this record with any transform function
            const transformFunction = (record: any) => {
                return {
                    original_id: record.id,
                    processed_field: record.example_field?.toUpperCase() || null,
                    processing_timestamp: new Date().toISOString(),
                    source_timestamp: new Date(record._streamkap_source_ts_ms).toISOString(),
                    streamkap_timestamp: new Date(record._streamkap_ts_ms).toISOString()
                };
            };

            const result = transformFunction(mockRecord.value);

            expect(result.original_id).toBe(1);
            expect(result.processed_field).toBe("SAMPLE_VALUE");
            expect(result.processing_timestamp).toBeDefined();
            expect(result.source_timestamp).toBeDefined();
            expect(result.streamkap_timestamp).toBeDefined();
        });

        it("should support creating test variations", () => {
            // Create test variations based on the record
            const variations = JSONRecordHelper.generateRecordSequence(mockRecord, 3);

            expect(variations).toHaveLength(3);
            
            // Each variation should have same value data but different metadata
            expect(variations[0].value.id).toBe(1);
            expect(variations[1].value.id).toBe(1); 
            expect(variations[2].value.id).toBe(1);
            
            // But offsets should be sequential
            expect(variations[0].metadata.offset).toBe(12345);
            expect(variations[1].metadata.offset).toBe(12346);
            expect(variations[2].metadata.offset).toBe(12347);
            
            // Timestamps should be sequential (1 second apart)
            const time0 = variations[0].metadata.timestamp;
            const time1 = variations[1].metadata.timestamp;
            const time2 = variations[2].metadata.timestamp;
            
            expect(time1 - time0).toBe(1000); // 1 second difference
            expect(time2 - time1).toBe(1000); // 1 second difference
        });
    });

    describe("Data Edge Cases", () => {
        it("should handle timestamp values", () => {
            // Real records may have large timestamp values (nanoseconds from Debezium)
            const timestamp = mockRecord.value._streamkap_source_ts_ms;
            expect(timestamp).toBeDefined();
            
            // Convert to Date for handling
            const date = new Date(timestamp);
            expect(date.getFullYear()).toBeGreaterThanOrEqual(2024);
        });

        it("should handle null/optional fields gracefully", () => {
            // Test with a variation that has null fields
            const recordWithNulls = JSONRecordHelper.createTestRecord(mockRecord, {
                value: {
                    ...mockRecord.value,
                    example_field: null
                }
            });

            expect(recordWithNulls.value.example_field).toBe(null);
            expect(recordWithNulls.value.id).toBe(1); // Should keep non-null values
        });
    });

    describe("Testing Integration", () => {
        it("should work with JSON.parse from copied string", () => {
            // Simulate copying the JSON as a string and parsing it (what users will do)
            const jsonString = JSON.stringify(mockRecord, null, 2);
            const parsedRecord = JSON.parse(jsonString);
            
            // Should be identical to original
            expect(parsedRecord).toEqual(mockRecord);
            expect(JSONRecordHelper.validateRecordStructure(parsedRecord)).toBe(true);
        });

        it("should have complete record structure", () => {
            // Verify the record has all required fields
            expect(mockRecord.key).toBeDefined();
            expect(mockRecord.value).toBeDefined(); 
            expect(mockRecord.keySchema).toBeDefined();
            expect(mockRecord.valueSchema).toBeDefined();
            expect(mockRecord.headers).toBeDefined();
            expect(mockRecord.metadata).toBeDefined();
            
            // Should not have testing notes - clean JSON from Topics page
            expect((mockRecord as any)._testingNotes).toBeUndefined();
        });
    });

    describe("Performance Testing", () => {
        it("should handle multiple records efficiently", () => {
            // Generate a batch based on the record template
            const batchSize = 100;
            const recordBatch = JSONRecordHelper.generateRecordSequence(mockRecord, batchSize);
            
            const startTime = Date.now();
            
            // Process all records (simulate transformation)
            const results = recordBatch.map(record => ({
                id: record.value.id,
                field: record.value.example_field,
                processed: true,
                timestamp: record.metadata.timestamp
            }));
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            expect(results).toHaveLength(batchSize);
            expect(processingTime).toBeLessThan(100); // Should process 100 records in under 100ms
            
            console.log(`Processed ${batchSize} records in ${processingTime}ms (${(processingTime / batchSize).toFixed(2)}ms per record)`);
        });
    });

    // AFTER PASTING REAL DATA:
    // 1. Replace 'mockRecord' with your real record variable name
    // 2. Update field names in tests to match your real data structure  
    // 3. Update expected values to match your real data
    // 4. Run: npm test src/RealProductionData.test.ts -- --verbose
    // 5. All tests should pass with your real Streamkap data!
});