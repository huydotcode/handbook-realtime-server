import Redis, { Redis as RedisClient } from 'ioredis';
import { config } from '../config/config';

type SubscriptionCallback = (message: string) => void;

class RedisService {
    private redis: RedisClient;
    private subscriber: RedisClient;
    private subscriptions: Map<string, Set<SubscriptionCallback>> = new Map();

    constructor() {
        const redisUrl = config.redisUrl;

        if (!redisUrl) {
            throw new Error('REDIS_URL is not defined');
        }

        this.redis = new Redis(redisUrl);
        this.subscriber = new Redis(redisUrl);
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
}

export const redisService = new RedisService();
