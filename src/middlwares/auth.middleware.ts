import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';

export const authMiddleware = (
    socket: Socket,
    next: (err?: ExtendedError) => void
) => {
    try {
        const token = socket.handshake.auth.accessToken;

        if (!process.env.JWT_SECRET) {
            return next(new Error('JWT_SECRET is not defined'));
        }

        const isValid = jwt.verify(token, process.env.JWT_SECRET);
        if (isValid) {
            return next();
        }

        next(new Error('Unauthorized'));
    } catch (error) {
        next(new Error('Authentication failed'));
    }
};
