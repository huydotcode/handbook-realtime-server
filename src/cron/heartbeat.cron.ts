import cron from 'node-cron';
import User from '../models/User';
import { log } from '../utils/logger';

const isDevelopment = process.env.NODE_ENV === 'development';

export const HEARTBEAT_SCHEDULE = {
    EVERY_ONE_MINUTE: '*/1 * * * *',
    EVERY_FIVE_MINUTES: '*/5 * * * *',
    EVERY_SECOND: '* * * * * *',
};

const getHeartbeatSchedule = () => {
    if (isDevelopment) {
        return HEARTBEAT_SCHEDULE.EVERY_SECOND;
    }
    return HEARTBEAT_SCHEDULE.EVERY_FIVE_MINUTES;
};

export function heartbeatCron() {
    cron.schedule(getHeartbeatSchedule(), async () => {
        log('HEARTBEAT CRON');
        const now = Date.now();
        const timeout = 60 * 1000;

        await User.updateMany(
            { lastAccessed: { $lt: new Date(now - timeout) } },
            { isOnline: false }
        );
    });
}
