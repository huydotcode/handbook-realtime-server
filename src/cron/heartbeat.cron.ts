import cron from 'node-cron';
import User from '../models/User';
import { log } from '../utils/logger';

const HEARTBEAT_SCHEDULE = {
    EVERY_ONE_MINUTE: '*/1 * * * *',
    EVERY_SECOND: '* * * * * *',
};

export function heartbeatCron() {
    cron.schedule(HEARTBEAT_SCHEDULE.EVERY_SECOND, async () => {
        log('HEARTBEAT CRON');
        const now = Date.now();
        const timeout = 60 * 1000; // 1 phút

        await User.updateMany(
            { lastAccessed: { $lt: new Date(now - timeout) } },
            { isOnline: false }
        );
    });
}
