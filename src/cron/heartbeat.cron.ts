import cron from 'node-cron';
import { log } from '../common/utils/logger';
import { apiService } from '../services/api.service';

const isDevelopment = process.env.NODE_ENV === 'development';

export const HEARTBEAT_SCHEDULE = {
    EVERY_ONE_MINUTE: '*/1 * * * *',
    EVERY_FIVE_MINUTES: '*/5 * * * *',
    EVERY_SECOND: '* * * * * *',
};

const getHeartbeatSchedule = () => {
    if (isDevelopment) {
        return HEARTBEAT_SCHEDULE.EVERY_ONE_MINUTE;
    }
    return HEARTBEAT_SCHEDULE.EVERY_FIVE_MINUTES;
};

export function heartbeatCron() {
    cron.schedule(getHeartbeatSchedule(), async () => {
        log('HEARTBEAT CRON');

        await apiService.cleanupHeartbeat();
    });
}
