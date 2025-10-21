import { heartbeatCron } from './heartbeat.cron';

export function cronRun() {
    heartbeatCron();
}
