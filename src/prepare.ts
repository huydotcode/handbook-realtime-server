import { cronRun } from './cron/cron.handler';
import { connectDB } from './database/mongodb';
import { redisService, videoCallService } from './services';

function clearVideoCall() {
    setInterval(() => {
        videoCallService.cleanupExpiredCalls();
    }, 30000);
}

export async function prepare() {
    console.log('Preparing the project...');

    await connectDB();
    redisService.getClient();
    cronRun();
    clearVideoCall();

    console.log('Project is ready.');
}
