// topicTransform.ts - Topic routing transformation logic
// This handles routing records to different output topics based on business logic

import { CommonTransform } from './commonTransform';

/**
 * Topic Transform Class
 * 
 * This class handles the routing of records to different topics based on business logic.
 * This is primarily used for fan_out transforms where records need to be sent to multiple topics.
 * Customize this based on your routing and business logic requirements.
 */
export class TopicTransform {
    private commonTransform: CommonTransform;
    
    constructor() {
        this.commonTransform = new CommonTransform();
    }
    
    /**
     * Main topic transformation function for fan_out transforms
     * 
     * @param valueObject - The record value to route
     * @param keyObject - The record key (for context)
     * @param topic - Source topic name
     * @param timestamp - Record timestamp
     * @returns Single topic string or array of topics for fan-out
     */
    public transform(valueObject: any, keyObject: any, topic: string, timestamp: number): string | string[] {
        try {
            // Enhanced input validation
            const validation = this.commonTransform.validateInput(valueObject, keyObject, topic, timestamp);
            if (!validation.valid) {
                this.commonTransform.log('error', 'Topic transform input validation failed', { errors: validation.errors });
                return this.commonTransform.sanitizeTopicName('validation-errors');
            }
            
            // Normalize timestamp
            const normalizedTimestamp = this.commonTransform.normalizeTimestamp(timestamp);
            
            const topics: string[] = [];
            
            // Use common transform to determine routing
            const routingTopics = this.commonTransform.getRoutingTopics(valueObject, topic);
            
            // Ensure we have an array to work with
            const baseTopics = Array.isArray(routingTopics) ? routingTopics : [routingTopics];
            topics.push(...baseTopics);
            
            // Add additional routing logic here
            
            // Example: Route based on record type
            if (valueObject?.type && typeof valueObject.type === 'string') {
                let routedTopic: string;
                switch (valueObject.type) {
                    case 'order':
                        routedTopic = 'orders-processed';
                        break;
                    case 'user':
                        routedTopic = 'users-processed';
                        break;
                    case 'payment':
                        routedTopic = 'payments-processed';
                        break;
                    default:
                        routedTopic = 'general-processed';
                }
                topics.push(this.commonTransform.sanitizeTopicName(routedTopic));
            }
            
            // Example: Route high-value records to special topic
            if (valueObject?.amount && typeof valueObject.amount === 'number' && valueObject.amount > 1000) {
                topics.push(this.commonTransform.sanitizeTopicName('high-value-records'));
            }
            
            // Example: Route errors to error topic
            if (!this.commonTransform.validateRecord(valueObject)) {
                topics.push(this.commonTransform.sanitizeTopicName('error-records'));
            }
            
            // Example: Time-based routing
            const hour = new Date(normalizedTimestamp).getHours();
            if (hour >= 9 && hour <= 17) {
                topics.push(this.commonTransform.sanitizeTopicName('business-hours-records'));
            } else {
                topics.push(this.commonTransform.sanitizeTopicName('after-hours-records'));
            }
            
            // Remove duplicates and validate all topic names
            const uniqueTopics = Array.from(new Set(topics))
                .filter(t => this.commonTransform.validateTopicName(t));
            
            if (uniqueTopics.length === 0) {
                return this.commonTransform.sanitizeTopicName('fallback-topic');
            }
            
            return uniqueTopics.length > 1 ? uniqueTopics : uniqueTopics[0];
            
        } catch (error) {
            const errorContext = this.commonTransform.createErrorContext(error, 'topicTransform', valueObject);
            this.commonTransform.log('error', 'Topic transformation failed', errorContext);
            
            // Fallback to sanitized error topic
            return this.commonTransform.sanitizeTopicName('transform-errors');
        }
    }
    
    /**
     * Simple topic routing based on business rules
     * Use this for straightforward routing scenarios
     */
    public simpleRoute(valueObject: any, keyObject: any, topic: string, timestamp: number): string {
        try {
            // Example: Route based on customer tier
            if (valueObject && valueObject.customer_tier) {
                switch (valueObject.customer_tier) {
                    case 'premium':
                        return 'premium-customer-records';
                    case 'gold':
                        return 'gold-customer-records';
                    case 'standard':
                        return 'standard-customer-records';
                    default:
                        return 'unknown-tier-records';
                }
            }
            
            // Example: Route based on geographic region
            if (valueObject && valueObject.region) {
                return `${valueObject.region}-records`;
            }
            
            // Example: Route based on source topic pattern
            if (topic.includes('orders')) {
                return 'all-orders-processed';
            } else if (topic.includes('users')) {
                return 'all-users-processed';
            }
            
            // Default routing
            return 'processed-records';
            
        } catch (error) {
            console.error('Simple topic routing failed:', error);
            return 'routing-errors';
        }
    }
    
    /**
     * Complex multi-condition routing
     * Use this when you have sophisticated business logic
     */
    public complexRoute(valueObject: any, keyObject: any, topic: string, timestamp: number): string | string[] {
        const topics: string[] = [];
        
        try {
            // Multi-dimensional routing based on multiple conditions
            
            // Dimension 1: Record type and status
            if (valueObject && valueObject.type && valueObject.status) {
                const typeStatusTopic = `${valueObject.type}-${valueObject.status}`;
                topics.push(typeStatusTopic);
            }
            
            // Dimension 2: Priority routing
            if (valueObject && valueObject.priority) {
                topics.push(`priority-${valueObject.priority}`);
            }
            
            // Dimension 3: Compliance and regulatory routing
            if (valueObject && valueObject.compliance_required) {
                topics.push('compliance-records');
            }
            
            // Dimension 4: Analytics and reporting
            if (this.shouldRouteToAnalytics(valueObject)) {
                topics.push('analytics-records');
            }
            
            // Dimension 5: Archive routing for old records
            const recordAge = timestamp ? Date.now() - timestamp : 0;
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
            if (recordAge > thirtyDaysMs) {
                topics.push('archive-records');
            } else {
                topics.push('active-records');
            }
            
            // Remove duplicates
            const uniqueTopics = Array.from(new Set(topics));
            return uniqueTopics.length > 1 ? uniqueTopics : uniqueTopics[0];
            
        } catch (error) {
            console.error('Complex routing failed:', error);
            return 'complex-routing-errors';
        }
    }
    
    /**
     * Conditional routing with business logic
     */
    public conditionalRoute(valueObject: any, keyObject: any, topic: string, timestamp: number): string | string[] {
        const routes: string[] = [];
        
        try {
            // Always route to main processing topic
            routes.push('main-processed');
            
            // Conditional additional routing
            
            // Route VIP customers to special processing
            if (valueObject && valueObject.customer_type === 'vip') {
                routes.push('vip-processing');
            }
            
            // Route fraud-flagged records to security
            if (valueObject && valueObject.fraud_score > 0.8) {
                routes.push('fraud-review');
            }
            
            // Route international records to compliance
            if (valueObject && valueObject.country && valueObject.country !== 'US') {
                routes.push('international-compliance');
            }
            
            // Route real-time vs batch processing
            const isRealTime = Date.now() - timestamp < 5000; // 5 seconds
            if (isRealTime) {
                routes.push('realtime-processing');
            } else {
                routes.push('batch-processing');
            }
            
            return routes.length > 1 ? routes : routes[0];
            
        } catch (error) {
            console.error('Conditional routing failed:', error);
            return 'conditional-routing-errors';
        }
    }
    
    /**
     * Helper: Determine if record should go to analytics
     */
    private shouldRouteToAnalytics(valueObject: any): boolean {
        // Example analytics routing criteria
        if (!valueObject) return false;
        
        // Route high-value transactions
        if (valueObject.amount && valueObject.amount > 500) {
            return true;
        }
        
        // Route user engagement events
        if (valueObject.event_type && ['login', 'purchase', 'signup'].includes(valueObject.event_type)) {
            return true;
        }
        
        // Route A/B test events
        if (valueObject.experiment_id) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Validate topic names
     * Ensure topic names follow naming conventions
     */
    public validateTopicName(topicName: string): boolean {
        if (!topicName || typeof topicName !== 'string') {
            return false;
        }
        
        // Check for valid Kafka topic naming
        const validPattern = /^[a-zA-Z0-9._-]+$/;
        if (!validPattern.test(topicName)) {
            console.warn(`Invalid topic name: ${topicName}`);
            return false;
        }
        
        // Check length (Kafka limit is 249 characters)
        if (topicName.length > 249) {
            console.warn(`Topic name too long: ${topicName}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Sanitize topic name to ensure it's valid
     */
    public sanitizeTopicName(topicName: string): string {
        if (!topicName) return 'default-topic';
        
        // Replace invalid characters
        let sanitized = topicName.replace(/[^a-zA-Z0-9._-]/g, '-');
        
        // Ensure it doesn't start with a dot
        if (sanitized.startsWith('.')) {
            sanitized = 'topic' + sanitized;
        }
        
        // Truncate if too long
        if (sanitized.length > 249) {
            sanitized = sanitized.substring(0, 249);
        }
        
        return sanitized;
    }
}