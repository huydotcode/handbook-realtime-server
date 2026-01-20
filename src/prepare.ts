import { Server } from 'socket.io';
import { cronRun } from './cron/cron.handler';
import { redisService, videoCallService } from './services';
import { EventSubscriber } from './services/event.subscriber';

function clearVideoCall() {
    setInterval(() => {
        videoCallService.cleanupExpiredCalls();
    }, 30000);
}

export async function prepare(io?: Server) {
    console.log('Preparing the project...');

    // DB connection removed (using API instead)
    redisService.getClient();
    cronRun();
    clearVideoCall();

    // Initialize event subscriber if io instance is provided
    if (io) {
        new EventSubscriber(io);
        console.log('Event subscriber initialized');
    }

    console.log('Project is ready.');
}
