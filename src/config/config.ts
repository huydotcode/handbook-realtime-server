export const config = {
    port: process.env.PORT || 5000,
    mongodbUri:
        process.env.MONGODB_URI || 'mongodb://localhost:27017/defaultdb',
    clientHost: process.env.CLIENT_HOST || 'http://localhost:3000',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || '',
    },
    corsOptions: {
        origin: [
            process.env.CLIENT_HOST || 'http://localhost:3000',
            'http://localhost:3000',
        ],
        credentials: true,
    },
    socketOptions: {
        cors: {
            origin: [
                process.env.CLIENT_HOST || 'http://localhost:3000',
                'http://localhost:3000',
            ],
            credentials: true,
        },
    },
};
