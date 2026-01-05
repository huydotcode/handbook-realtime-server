import Redis, { Redis as RedisClient } from 'ioredis';
import { config } from '../config/config';

// Define global type augmentation for Redis singleton
declare global {
    var redisClientInstance: RedisClient | undefined;
}

type SubscriptionCallback = (message: string) => void;

/**
 * Get or create singleton Redis client instance
 */
const getRedisClient = (): RedisClient => {
    if (global.redisClientInstance) {
        return global.redisClientInstance;
    }

    const redisUrl = config.redisUrl;
    if (!redisUrl) {
        throw new Error('REDIS_URL is not defined');
    }

    const redisOptions = {
        // Connection pooling
        maxRetriesPerRequest: null,
        retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        reconnectOnError: (err: Error) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
                return true;
            }
            return false;
        },
        // Keep-alive settings
        keepAlive: 30000,
        enableReadyCheck: true,
        enableOfflineQueue: true,
    };

    const client = new Redis(redisUrl, redisOptions);
    client.on('connect', () => console.log('✅ Redis client connected'));
    client.on('error', (err) => console.error('❌ Redis client error:', err));

    global.redisClientInstance = client;
    return client;
};

class RedisService {
    private redis: RedisClient;
    private subscriber: RedisClient;
    private subscriptions: Map<string, Set<SubscriptionCallback>> = new Map();

    constructor() {
        // Get singleton base client
        this.redis = getRedisClient();

        // Use duplicate() instead of new Redis() to reuse connection pool
        // This shares the underlying socket but has its own command queue
        this.subscriber = this.redis.duplicate({
            // Connection pooling
            maxRetriesPerRequest: null,
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            reconnectOnError: (err: Error) => {
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) {
                    return true;
                }
                return false;
            },
            // Keep-alive settings
            keepAlive: 30000,
            enableReadyCheck: true,
            enableOfflineQueue: true,
        });
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.redis.on('connect', () =>
            console.log('✅ Redis client connected')
        );
        this.redis.on('error', (err) =>
            console.error('❌ Redis client error:', err)
        );

        this.subscriber.on('connect', () =>
            console.log('✅ Redis subscriber connected')
        );
        this.subscriber.on('error', (err) =>
            console.error('❌ Redis subscriber error:', err)
        );

        // Handle incoming messages
        this.subscriber.on('message', (channel: string, message: string) => {
            const callbacks = this.subscriptions.get(channel);
            if (callbacks) {
                callbacks.forEach((callback) => {
                    try {
                        callback(message);
                    } catch (error) {
                        console.error(
                            `Error in subscription callback for ${channel}:`,
                            error
                        );
                    }
                });
            }
        });
    }

    getClient(): Redis {
        return this.redis;
    }

    async set(key: string, value: string, expireTime?: number): Promise<void> {
        if (expireTime) {
            await this.redis.setex(key, expireTime, value);
        } else {
            await this.redis.set(key, value);
        }
    }

    async get(key: string): Promise<string | null> {
        return await this.redis.get(key);
    }

    async del(key: string): Promise<void> {
        await this.redis.del(key);
    }

    /**
     * Subscribe to a Redis channel
     * @param channel - Channel name
     * @param callback - Callback function to handle messages
     */
    subscribe(channel: string, callback: SubscriptionCallback): void {
        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, new Set());
            this.subscriber.subscribe(channel);
            console.log(`📥 Subscribed to channel: ${channel}`);
        }

        this.subscriptions.get(channel)!.add(callback);
    }

    /**
     * Unsubscribe from a Redis channel
     * @param channel - Channel name
     * @param callback - Optional specific callback to remove
     */
    unsubscribe(channel: string, callback?: SubscriptionCallback): void {
        const callbacks = this.subscriptions.get(channel);
        if (!callbacks) return;

        if (callback) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.subscriber.unsubscribe(channel);
                this.subscriptions.delete(channel);
                console.log(`📤 Unsubscribed from channel: ${channel}`);
            }
        } else {
            this.subscriber.unsubscribe(channel);
            this.subscriptions.delete(channel);
            console.log(`📤 Unsubscribed from channel: ${channel}`);
        }
    }

    /**
     * Unsubscribe from all channels
     */
    unsubscribeAll(): void {
        this.subscriber.unsubscribe();
        this.subscriptions.clear();
        console.log('📤 Unsubscribed from all channels');
    }

    /**
     * Disconnect from Redis
     */
    async disconnect(): Promise<void> {
        try {
            await this.redis.quit();
            console.log('✅ Redis client disconnected');
        } catch (error) {
            console.warn('Redis client disconnect warning:', error);
        }

        try {
            await this.subscriber.quit();
            console.log('✅ Redis subscriber disconnected');
        } catch (error) {
            console.warn('Redis subscriber disconnect warning:', error);
        }
    }
}

/**
 * Singleton RedisService instance
 * Reuses Redis connections across hot reloads in development
 */
declare global {
    var redisServiceInstance: RedisService | undefined;
}

let redisServiceSingleton = global.redisServiceInstance;
if (!redisServiceSingleton) {
    redisServiceSingleton = new RedisService();
    global.redisServiceInstance = redisServiceSingleton;
}

export const redisService = redisServiceSingleton;
