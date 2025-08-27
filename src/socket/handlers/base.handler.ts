import { Socket } from 'socket.io';

export interface SocketHandlerInterface {
    handle(socket: Socket, io: any, data?: any): Promise<void> | void;
}

export abstract class BaseSocketHandler implements SocketHandlerInterface {
    protected socket: Socket;
    protected io: any;
    protected userId: string;

    constructor(socket: Socket, io: any, userId: string) {
        this.socket = socket;
        this.io = io;
        this.userId = userId;
    }

    abstract handle(socket: Socket, io: any, data?: any): Promise<void> | void;

    protected log(event: string, data?: any): void {
        console.log(`[${this.constructor.name}] ${event}:`, data || '');
    }

    protected error(message: string, error?: any): void {
        console.error(`[${this.constructor.name}] ${message}:`, error || '');
    }

    protected validateData(data: any, requiredFields: string[]): boolean {
        if (!data) return false;

        for (const field of requiredFields) {
            if (!data[field]) {
                this.error(`Missing required field: ${field}`);
                return false;
            }
        }
        return true;
    }
}
