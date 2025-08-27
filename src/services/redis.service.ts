import Redis from 'ioredis';
import { config } from '../config/config';

class RedisService {
    private redis: Redis;

    constructor() {
        this.redis = new Redis(config.redisUrl);
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.redis.on('connect', () => console.log('Connected to Redis'));
        this.redis.on('error', (err) => console.error('Redis error:', err));
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
}

export const redisService = new RedisService();
