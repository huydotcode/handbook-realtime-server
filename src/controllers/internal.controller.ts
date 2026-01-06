import { Request, Response } from 'express';
import { config } from '../config/config';
import { eventSubscriber } from '../services/event.subscriber';

export class InternalController {
    /**
     * Handle internal event emission
     * POST /internal/events
     * Body: { channel: string, data: any }
     * Header: x-internal-secret
     */
    static async emitEvent(req: Request, res: Response) {
        try {
            const secret = req.headers['x-internal-secret'];
            if (secret !== config.internalSecretKey) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            const { channel, data } = req.body;

            if (!channel || !data) {
                return res
                    .status(400)
                    .json({ message: 'Missing channel or data' });
            }

            // Emit using EventSubscriber to ensure proper room/user routing
            if (eventSubscriber) {
                eventSubscriber.dispatch(channel, data);
            } else {
                console.error('EventSubscriber instance not ready');
                return res.status(503).json({ message: 'Service not ready' });
            }

            console.log(`📡 Internal API emitted event: ${channel}`);
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error emitting internal event:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}
